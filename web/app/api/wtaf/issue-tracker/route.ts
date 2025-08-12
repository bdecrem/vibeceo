import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Type definitions
interface SuperpowerAction {
    action: 'updateStatus' | 'addComment' | 'setTriage';
    issueId: string;
    data?: any;
}

interface AuthenticatedUser {
    id: string;
    role: string;
    email: string;
}

// Validate authentication token
async function validateAuth(authHeader: string | null): Promise<AuthenticatedUser | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.substring(7);
    
    try {
        // Verify token with Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            console.log('Auth error:', error);
            return null;
        }
        
        // Get user role from wtaf_users table
        const { data: userRecord, error: userError } = await supabase
            .from('wtaf_users')
            .select('role, email')
            .eq('id', user.id)
            .single();
            
        if (userError || !userRecord) {
            console.log('User record error:', userError);
            return null;
        }
        
        return {
            id: user.id,
            role: userRecord.role || 'user',
            email: userRecord.email || user.email || ''
        };
    } catch (error) {
        console.error('Token validation error:', error);
        return null;
    }
}

// Check if user has superpower permissions
function hasSuperpowerPermissions(user: AuthenticatedUser): boolean {
    const allowedRoles = ['admin', 'operator', 'moderator'];
    return allowedRoles.includes(user.role);
}

// Handle updating issue status
async function updateIssueStatus(issueId: string, newStatus: string, user: AuthenticatedUser) {
    // Get the issue from ZAD collaborative table
    const { data: issue, error: fetchError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('id', issueId)
        .eq('action_type', 'issue')
        .single();
        
    if (fetchError || !issue) {
        throw new Error('Issue not found');
    }
    
    // Update the issue status
    const updatedData = {
        ...issue.content_data,
        status: newStatus,
        superpower_updated_by: user.email,
        superpower_updated_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({
            content_data: updatedData
        })
        .eq('id', issueId);
        
    if (updateError) {
        throw new Error('Failed to update issue status');
    }
    
    return { success: true, newStatus };
}

// Handle adding a comment
async function addComment(issueId: string, comment: string, user: AuthenticatedUser) {
    // Get the issue from ZAD collaborative table
    const { data: issue, error: fetchError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('id', issueId)
        .eq('action_type', 'issue')
        .single();
        
    if (fetchError || !issue) {
        throw new Error('Issue not found');
    }
    
    // Add comment to the issue
    const updatedData = {
        ...issue.content_data,
        superpower_comment: comment,
        superpower_comment_by: user.email,
        superpower_comment_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({
            content_data: updatedData
        })
        .eq('id', issueId);
        
    if (updateError) {
        throw new Error('Failed to add comment');
    }
    
    return { success: true, comment };
}

// Handle setting triage priority
async function setTriage(issueId: string, priority: string, user: AuthenticatedUser) {
    // Get the issue from ZAD collaborative table
    const { data: issue, error: fetchError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('id', issueId)
        .eq('action_type', 'issue')
        .single();
        
    if (fetchError || !issue) {
        throw new Error('Issue not found');
    }
    
    // Update the issue priority
    const updatedData = {
        ...issue.content_data,
        priority: priority,
        triage_by: user.email,
        triage_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({
            content_data: updatedData
        })
        .eq('id', issueId);
        
    if (updateError) {
        throw new Error('Failed to set triage priority');
    }
    
    return { success: true, priority };
}

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: SuperpowerAction = await request.json();
        const { action, issueId, data } = body;
        
        // Validate authentication
        const authHeader = request.headers.get('authorization');
        const user = await validateAuth(authHeader);
        
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        // Check superpower permissions
        if (!hasSuperpowerPermissions(user)) {
            return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            );
        }
        
        // Validate required fields
        if (!action || !issueId) {
            return NextResponse.json(
                { error: 'Missing required fields: action, issueId' },
                { status: 400 }
            );
        }
        
        // Execute the requested action
        let result;
        switch (action) {
            case 'updateStatus':
                if (!data.status) {
                    return NextResponse.json(
                        { error: 'Missing status in data' },
                        { status: 400 }
                    );
                }
                result = await updateIssueStatus(issueId, data.status, user);
                break;
                
            case 'addComment':
                if (!data.comment) {
                    return NextResponse.json(
                        { error: 'Missing comment in data' },
                        { status: 400 }
                    );
                }
                result = await addComment(issueId, data.comment, user);
                break;
                
            case 'setTriage':
                if (!data.priority) {
                    return NextResponse.json(
                        { error: 'Missing priority in data' },
                        { status: 400 }
                    );
                }
                result = await setTriage(issueId, data.priority, user);
                break;
                
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
        
        return NextResponse.json(result);
        
    } catch (error) {
        console.error('Issue tracker API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    return NextResponse.json({ 
        status: 'ok', 
        service: 'issue-tracker-superpower-api',
        timestamp: new Date().toISOString()
    });
}