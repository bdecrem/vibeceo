#import "RNWidgetBridge.h"
#import <React/RCTLog.h>

@implementation RNWidgetBridge {
    RCTBridge *_bridge;
}

+ (instancetype)shared {
    static RNWidgetBridge *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[RNWidgetBridge alloc] init];
    });
    return sharedInstance;
}

RCT_EXPORT_MODULE(NativeAudioBridge);

- (NSArray<NSString *> *)supportedEvents {
    return @[@"audioCommand", @"widgetEvent"];
}

- (void)setupWithBridge:(RCTBridge *)bridge {
    _bridge = bridge;
}

RCT_EXPORT_METHOD(playNote:(NSString *)note 
                  octave:(NSInteger)octave 
                  duration:(double)duration
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        // Get reference to NativeAudioEngine from Swift
        Class audioEngineClass = NSClassFromString(@"Webtoys.NativeAudioEngine");
        if (audioEngineClass) {
            id sharedInstance = [audioEngineClass performSelector:@selector(shared)];
            if (sharedInstance) {
                NSDictionary *command = @{
                    @"action": @"playNote",
                    @"note": note,
                    @"octave": @(octave),
                    @"duration": @(duration)
                };
                
                [sharedInstance performSelector:@selector(processAudioCommand:) withObject:command];
                resolve(@"Note played successfully");
            } else {
                reject(@"audio_error", @"NativeAudioEngine not available", nil);
            }
        } else {
            reject(@"audio_error", @"NativeAudioEngine class not found", nil);
        }
    });
}

RCT_EXPORT_METHOD(playChord:(NSArray *)notes
                  octave:(NSInteger)octave
                  duration:(double)duration
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        Class audioEngineClass = NSClassFromString(@"Webtoys.NativeAudioEngine");
        if (audioEngineClass) {
            id sharedInstance = [audioEngineClass performSelector:@selector(shared)];
            if (sharedInstance) {
                NSDictionary *command = @{
                    @"action": @"playChord",
                    @"notes": notes,
                    @"octave": @(octave),
                    @"duration": @(duration)
                };
                
                [sharedInstance performSelector:@selector(processAudioCommand:) withObject:command];
                resolve(@"Chord played successfully");
            } else {
                reject(@"audio_error", @"NativeAudioEngine not available", nil);
            }
        } else {
            reject(@"audio_error", @"NativeAudioEngine class not found", nil);
        }
    });
}

RCT_EXPORT_METHOD(playScale:(NSString *)root
                  scaleType:(NSString *)scaleType
                  octave:(NSInteger)octave
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        Class audioEngineClass = NSClassFromString(@"Webtoys.NativeAudioEngine");
        if (audioEngineClass) {
            id sharedInstance = [audioEngineClass performSelector:@selector(shared)];
            if (sharedInstance) {
                NSDictionary *command = @{
                    @"action": @"playScale",
                    @"root": root,
                    @"scaleType": scaleType,
                    @"octave": @(octave)
                };
                
                [sharedInstance performSelector:@selector(processAudioCommand:) withObject:command];
                resolve(@"Scale played successfully");
            } else {
                reject(@"audio_error", @"NativeAudioEngine not available", nil);
            }
        } else {
            reject(@"audio_error", @"NativeAudioEngine class not found", nil);
        }
    });
}

@end