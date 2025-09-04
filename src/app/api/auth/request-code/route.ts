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

    // Use Supabase Auth to send OTP email (without emailRedirectTo to get just the code)
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          name: participant.name,
          major: participant.major,
          year: participant.year,
          role: 'student'
        }
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