#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RNWidgetBridge : RCTEventEmitter <RCTBridgeModule>

+ (instancetype)shared;
- (void)setupWithBridge:(RCTBridge *)bridge;

@end