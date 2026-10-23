import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import brand from '../../brand.config.json' with { type: 'json' };
import config from './capacitor.config';
import pkg from './package.json' with { type: 'json' };

const read = (file: string): string => readFileSync(new URL(file, import.meta.url), 'utf8');

describe('the iPhone/Android projects', () => {
  it('carry the brand ids and name, and wrap the app build of the web app', () => {
    expect(config.appId).toBe(brand.appIds.ios);
    expect(config.appName).toBe(brand.appName);
    expect(config.webDir).toBe('../web/dist-native');
    expect(read('./ios/App/App.xcodeproj/project.pbxproj').match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)).toEqual(Array(2).fill(`PRODUCT_BUNDLE_IDENTIFIER = ${brand.appIds.ios};`));
    expect(read('./android/app/build.gradle')).toContain(`applicationId "${brand.appIds.android}"`);
  });

  it('take the store version from package.json', () => {
    expect(read('./ios/App/App.xcodeproj/project.pbxproj').match(/MARKETING_VERSION = ([^;]+);/g)).toEqual(Array(2).fill(`MARKETING_VERSION = ${pkg.version};`));
    expect(read('./android/app/build.gradle')).toContain("parse(file('../../package.json'))");
  });

  it('explain the microphone in Vietnamese and ask for it on Android', () => {
    expect(read('./ios/App/App/Info.plist')).toMatch(/<key>NSMicrophoneUsageDescription<\/key>\s*<string>[^<]*micro[^<]*<\/string>/);
    const manifest = read('./android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android.permission.RECORD_AUDIO');
    expect(manifest).toContain('android.permission.MODIFY_AUDIO_SETTINGS');
  });

  it('sign in through the system browser on the brand scheme, and keep the session in the Keychain/Keystore', () => {
    expect(read('./android/app/build.gradle')).toContain(`manifestPlaceholders += [systemAuthRedirectScheme: "${brand.urlScheme}"]`);
    // No other intent filter may claim the sign-in scheme (Android would show a chooser).
    expect(read('./android/app/src/main/AndroidManifest.xml')).not.toContain(`android:scheme="${brand.urlScheme}"`);
    const spm = read('./ios/App/CapApp-SPM/Package.swift');
    expect(spm).toContain('SharedNextCapacitorSystemAuth');
    expect(spm).toContain('AparajitaCapacitorSecureStorage');
    const gradle = read('./android/capacitor.settings.gradle');
    expect(gradle).toContain("include ':shared-next-capacitor-system-auth'");
    expect(gradle).toContain("include ':aparajita-capacitor-secure-storage'");
    expect(Object.keys(pkg.dependencies)).toEqual(expect.arrayContaining(['@shared-next/capacitor-system-auth', '@aparajita/capacitor-secure-storage']));
  });

  it('ship store-ready icons: a true 1024 px App Store icon without alpha, and Android adaptive layers with a themed one', () => {
    // PNG header: width at byte 16, colour type at byte 25 (2 = RGB, 6 = RGBA).
    const header = (file: string): { width: number; colourType: number } => {
      const png = readFileSync(new URL(file, import.meta.url));
      return { width: png.readUInt32BE(16), colourType: png[25] ?? -1 };
    };
    expect(header('./ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')).toEqual({ width: 1024, colourType: 2 });
    expect(header('../../assets/generated/brand/miu-logo-1024.png')).toEqual({ width: 1024, colourType: 2 });
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const xml = read(`./android/app/src/main/res/mipmap-anydpi-v26/${name}`);
      expect(xml).toContain('@mipmap/ic_launcher_foreground');
      expect(xml).toContain('<monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>');
    }
    expect(header('./android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_monochrome.png')).toEqual({ width: 432, colourType: 6 });
  });

  it('keep the signing material out of the repository', () => {
    const gradle = read('./android/app/build.gradle');
    expect(gradle).toContain("System.getenv('MIU_ANDROID_KEYSTORE')");
    expect(gradle).not.toMatch(/storePassword\s+['"]/);
  });
});
