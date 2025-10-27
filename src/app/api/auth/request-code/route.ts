import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateBabsonEmail } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('🔍 Request code for email:', email);

    // Validate email format
    if (!email || !validateBabsonEmail(email)) {
      console.log('❌ Invalid email format');
      return NextResponse.json(
        { error: 'Please use your @babson.edu email address' },
        { status: 400 }
      );
    }

    // Check if email exists in G1000 participants table
    console.log('🔍 Checking g1000_participants table for:', email.toLowerCase());
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('g1000_participants')
      .select('email, name, major, year')
      .eq('email', email.toLowerCase())
      .single();

    if (participantError) {
      console.log('❌ Database error:', participantError);
      return NextResponse.json(
        { error: 'Email not found. Please make sure you are registered for G1000.' },
        { status: 404 }
      );
    }

    if (!participant) {
      console.log('❌ No participant found for email:', email);
      return NextResponse.json(
        { error: 'Email not found. Please make sure you are registered for G1000.' },
        { status: 404 }
      );
    }

    console.log('✅ Found participant:', participant.name);

    // First, try to get the user by email
    let userExists = false;
    try {
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase());

      if (userData && !getUserError) {
        userExists = true;
        console.log('👤 User already exists in auth:', userData.user.id);
      }
    } catch (error) {
      // User doesn't exist, which is fine for first-time users
      console.log('👤 User does not exist yet in auth');
    }

    // If user doesn't exist, create them first
    if (!userExists) {
      console.log('🔨 Creating new user in Supabase Auth...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: false,
        user_metadata: {
          name: participant.name,
          major: participant.major,
          year: participant.year,
          role: 'student'
        }
      });

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        // If user already exists error, that's okay, continue with OTP
        if (!createError.message?.includes('already been registered')) {
          return NextResponse.json(
            { error: 'Failed to create user account. Please try again.' },
            { status: 500 }
          );
        }
        console.log('⚠️ User already exists, continuing with OTP...');
        userExists = true;
      } else {
        console.log('✅ User created successfully:', newUser.user.id);
      }
    }

    // Now send the OTP email
    console.log('📧 Sending OTP email...');
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: !userExists, // Only create if user doesn't exist
        data: !userExists ? {
          name: participant.name,
          major: participant.major,
          year: participant.year,
          role: 'student'
        } : undefined
      }
    });

    if (error) {
      console.error('❌ Supabase OTP error:', error);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    console.log('📧 OTP email sent successfully via Supabase Auth');

    return NextResponse.json(
      { message: 'Verification code sent to your email!' },
      { status: 200 }
    );

  } catch (error) {
    console.error('💥 Request code error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
} 