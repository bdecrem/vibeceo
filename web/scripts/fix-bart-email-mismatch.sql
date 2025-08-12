-- Fix the email mismatch for bart's account
UPDATE sms_subscribers
SET email = 'bdecrem@gmail.com'
WHERE phone_number = '+16508989508' AND slug = 'bart';

-- This will make your console login (bdecrem@gmail.com) match your SMS account