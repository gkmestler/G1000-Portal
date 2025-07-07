import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bio, linkedinUrl, githubUrl, personalWebsiteUrl, skills, proofOfWorkUrls } = body;

    // Validate URLs
    const urlFields = { linkedinUrl, githubUrl, personalWebsiteUrl };
    for (const [field, url] of Object.entries(urlFields)) {
      if (url && url.trim()) {
        try {
          new URL(url);
        } catch (error) {
          return NextResponse.json(
            { error: `Invalid ${field.replace('Url', '')} URL format` },
            { status: 400 }
          );
        }
      }
    }

    // Validate proof of work URLs
    if (proofOfWorkUrls && Array.isArray(proofOfWorkUrls)) {
      for (const url of proofOfWorkUrls) {
        if (url && url.trim()) {
          try {
            new URL(url);
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid proof of work URL format' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    const profileData = {
      user_id: user.id,
      bio: bio || null,
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
      personal_website_url: personalWebsiteUrl || null,
      skills: skills || [],
      proof_of_work_urls: proofOfWorkUrls || [],
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from('student_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Create new profile - we need major and year, which should come from G1000 verification
      // For now, set defaults that can be updated later
      const { data, error } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          ...profileData,
          major: 'Not specified',
          year: 'Not specified'
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Profile update error:', result.error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        userId: result.data.user_id,
        bio: result.data.bio,
        major: result.data.major,
        year: result.data.year,
        linkedinUrl: result.data.linkedin_url,
        githubUrl: result.data.github_url,
        personalWebsiteUrl: result.data.personal_website_url,
        resumeUrl: result.data.resume_url,
        skills: result.data.skills || [],
        proofOfWorkUrls: result.data.proof_of_work_urls || [],
        updatedAt: result.data.updated_at
      }
    });
  } catch (error) {
    console.error('Student profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 