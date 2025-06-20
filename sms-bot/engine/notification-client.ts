import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logWithTimestamp, logSuccess, logError } from './shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Send confirmation SMS
 * Extracted from monitor.py send_confirmation_sms function
 */
export async function sendConfirmationSms(message: string, phoneNumber: string | null = null): Promise<boolean> {
    try {
        logWithTimestamp(`📱 Sending confirmation SMS: ${message}`);
        
        // Use compiled JavaScript instead of TypeScript
        const smsScriptPath = join(dirname(__dirname), "scripts", "send-direct-sms.js");
        const cmd = ["node", smsScriptPath, message];
        
        if (phoneNumber) {
            cmd.push(phoneNumber);
            logWithTimestamp(`📱 Sending to: ${phoneNumber}`);
        }
        
        // Use the sms-bot directory for the working directory
        const smsBotDir = dirname(__dirname);
        
        return new Promise((resolve, reject) => {
            const child = spawn(cmd[0], cmd.slice(1), {
                cwd: smsBotDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                logWithTimestamp(`📱 SMS command: ${cmd.join(' ')}`);
                logWithTimestamp(`📱 SMS return code: ${code}`);
                logWithTimestamp(`📱 SMS stdout: ${stdout}`);
                logWithTimestamp(`📱 SMS stderr: ${stderr}`);
                
                if (code === 0) {
                    logSuccess("SMS sent successfully");
                    resolve(true);
                } else {
                    logError(`SMS failed with return code ${code}`);
                    reject(new Error(`SMS failed with code ${code}`));
                }
            });
            
            child.on('error', (error) => {
                logError(`SMS spawn error: ${error.message}`);
                reject(error);
            });
        });
        
    } catch (error) {
        logError(`SMS error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Send success notification with URLs
 * Helper function for successful WTAF creation
 */
export async function sendSuccessNotification(publicUrl: string, adminUrl: string | null = null, senderPhone: string | null = null): Promise<boolean> {
    try {
        let message;
        if (adminUrl) {
            message = `📱 Your app: ${publicUrl}\n📊 View data: ${adminUrl}`;
        } else {
            message = `📱 Your app is ready to use: ${publicUrl}`;
        }
        
        await sendConfirmationSms(message, senderPhone);
        return true;
    } catch (error) {
        logError(`Error sending success notification: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Send failure notification
 * Helper function for failed WTAF creation
 */
export async function sendFailureNotification(errorType = "generic", senderPhone = null) {
    try {
        let message;
        switch (errorType) {
            case "no-code":
                message = "🤷 That broke. Honestly, not surprised. Try a different WTAF?";
                break;
            case "database":
                message = "🤷 That broke. Database hiccup. Try a different WTAF?";
                break;
            default:
                message = "🤷 That broke. Database hiccup. Try a different WTAF?";
                break;
        }
        
        await sendConfirmationSms(message, senderPhone);
        return true;
    } catch (error) {
        logError(`Error sending failure notification: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
} 