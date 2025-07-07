import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVerificationCode, storeVerificationCode } from '@/lib/auth';
import { sendVerificationCode } from '@/lib/email';
import { validateBabsonEmail } from '@/lib/utils';

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

    // Generate and store verification code
    const code = await generateVerificationCode();
    console.log('📱 Generated verification code:', code);
    
    await storeVerificationCode(email, code);
    console.log('💾 Stored verification code in database');

    // Try to send verification code via email
    try {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'placeholder-key') {
        await sendVerificationCode(email, code);
        console.log('📧 Email sent successfully');
        
        return NextResponse.json(
          { message: 'Verification code sent successfully' },
          { status: 200 }
        );
      } else {
        // Development mode - return the code directly
        console.log('🧪 Development mode: returning verification code directly');
        return NextResponse.json(
          { 
            message: 'Verification code generated (development mode)',
            verificationCode: code, // Only for development!
            note: 'In production, this code would be sent via email'
          },
          { status: 200 }
        );
      }
    } catch (emailError) {
      console.error('📧 Email sending failed:', emailError);
      // If email fails, still return success but with the code for development
      return NextResponse.json(
        { 
          message: 'Verification code generated (email failed)',
          verificationCode: code, // Only for development!
          note: 'Email sending failed, but you can use this code'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('💥 Request code error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
} 