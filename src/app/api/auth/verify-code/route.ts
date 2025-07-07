import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyVerificationCode, signToken, createAuthResponse } from '@/lib/auth';
import { validateBabsonEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    // Validate input
    if (!email || !validateBabsonEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValidCode = await verifyVerificationCode(email, code);
    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Get participant details
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('g1000_participants')
      .select('email, name, major, year')
      .eq('email', email.toLowerCase())
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    let user = existingUser;

    // Create user if doesn't exist
    if (fetchError && fetchError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: participant.name,
          role: 'student',
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      user = newUser;

      // Create student profile
      const { error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          user_id: user.id,
          major: participant.major,
          year: participant.year,
          skills: [],
          proof_of_work_urls: [],
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway - profile can be created later
      }
    } else if (fetchError) {
      console.error('User fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create response with auth cookie
    return createAuthResponse(token, user);
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 