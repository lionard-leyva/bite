import { requireOptionalNativeModule, type NativeModule } from 'expo';

type ShareIntentEvents = {
  onShare: (event: { text: string }) => void;
};

declare class ShareIntentModule extends NativeModule<ShareIntentEvents> {
  getInitialShare(): string | null;
}

// null in Expo Go, iOS and Jest: sharing to Bite is Android dev/prod builds only for now.
const native = requireOptionalNativeModule<ShareIntentModule>('ShareIntent');

export function getInitialShare(): string | null {
  return native?.getInitialShare() ?? null;
}

export function addShareListener(listener: (text: string) => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener('onShare', (e) => listener(e.text));
  return () => sub.remove();
}
