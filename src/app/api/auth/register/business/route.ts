import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, businessName, contactName, industry, website } = body;

    // Validate required fields
    if (!email || !password || !businessName || !contactName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if email is in the approved list
    const { data: approvedEmail } = await supabaseAdmin
      .from('approved_business_emails')
      .select('id, is_active')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (!approvedEmail) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED_EMAIL',
          message: 'Your email is not in the approved list. Please contact the administrator.',
          businessName,
          contactName,
          email
        },
        { status: 403 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user record
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name: contactName,
        role: 'owner',
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create business owner authentication record
    const { error: authError } = await supabaseAdmin
      .from('business_owner_auth')
      .insert({
        user_id: userData.id,
        password_hash: hashedPassword,
      });

    if (authError) {
      console.error('Error creating auth record:', authError);
      // Cleanup: delete the user if auth creation fails
      await supabaseAdmin.from('users').delete().eq('id', userData.id);
      return NextResponse.json(
        { error: 'Failed to create authentication record' },
        { status: 500 }
      );
    }

    // Create business owner profile
    const { error: profileError } = await supabaseAdmin
      .from('business_owner_profiles')
      .insert({
        user_id: userData.id,
        company_name: businessName,
        industry_tags: industry ? [industry] : [],
        website_url: website || null,
        is_approved: false, // Requires admin approval
      });

    if (profileError) {
      console.error('Error creating business profile:', profileError);
      // Cleanup: delete the user and auth if profile creation fails
      await supabaseAdmin.from('business_owner_auth').delete().eq('user_id', userData.id);
      await supabaseAdmin.from('users').delete().eq('id', userData.id);
      return NextResponse.json(
        { error: 'Failed to create business profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Business account created successfully. Your account is pending approval.',
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 