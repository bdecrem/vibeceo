export interface StaffMeetingMessage {
    coach: string;
    content: string;
    format: 'timestamped' | 'bold';
    status: 'pending' | 'sent' | 'failed';
}

export interface StaffMeetingMetadata {
    total_messages: number;
    expected_duration: number;
    validation_status: 'valid' | 'invalid' | 'needs_review';
}

export interface StaffMeeting {
    timestamp: string;
    messages: StaffMeetingMessage[];
    metadata: StaffMeetingMetadata;
} 