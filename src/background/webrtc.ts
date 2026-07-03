import type { PrivacyConfig } from '../shared/types';

export async function applyWebRTCPolicy(config: PrivacyConfig): Promise<void> {
  if (!chrome.privacy?.network?.webRTCIPHandlingPolicy) {
    console.warn('WebRTC IP handling policy API not available');
    return;
  }

  try {
    const policy = config.webrtc.enabled ? config.webrtc.policy : 'default';
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: policy
    });
  } catch (error) {
    console.error('Failed to set WebRTC policy:', error);
  }
}

export async function resetWebRTCPolicy(): Promise<void> {
  if (!chrome.privacy?.network?.webRTCIPHandlingPolicy) {
    return;
  }

  try {
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: 'default'
    });
  } catch (error) {
    console.error('Failed to reset WebRTC policy:', error);
  }
}
