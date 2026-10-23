/**
 * Signed store builds, on the owner's Mac (never on CI in this round): an iOS archive for TestFlight, an Android App
 * Bundle for Google Play. Run through `pnpm mobile:release:ios` / `pnpm mobile:release:android`, which build the web
 * app and sync it first. The version is apps/mobile/package.json `version` (CFBundleShortVersionString / versionName);
 * the build number (CFBundleVersion / versionCode) is MIU_BUILD_NUMBER and must grow with every upload.
 *
 * The signing material stays outside the repository (the owner's iCloud, next to the other private files) and is
 * named by environment variables only; no value is printed:
 *   iOS      MIU_APPLE_TEAM_ID                (automatic signing with the team's certificate in the keychain)
 *   Android  MIU_ANDROID_KEYSTORE              (path of the upload keystore)
 *            MIU_ANDROID_KEYSTORE_PASSWORD     MIU_ANDROID_KEY_ALIAS     MIU_ANDROID_KEY_PASSWORD
 * android/app/build.gradle reads the Android ones; Gradle gets them from the environment, never the command line.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message: string): never {
  console.error(`release: ${message}`);
  process.exit(1);
}

function requireEnv(names: readonly string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) fail(`set ${missing.join(', ')} (see apps/mobile/scripts/release.ts)`);
}

function appVersion(): string {
  const pkg: unknown = JSON.parse(readFileSync(path.join(MOBILE_DIR, 'package.json'), 'utf8'));
  const version = typeof pkg === 'object' && pkg !== null && 'version' in pkg ? pkg.version : undefined;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) fail('apps/mobile/package.json version must be x.y.z');
  return version;
}

function buildNumber(): string {
  const value = process.env.MIU_BUILD_NUMBER ?? '';
  if (!/^[1-9]\d{0,8}$/.test(value)) fail('set MIU_BUILD_NUMBER to the next build number (a positive integer, larger than the last upload)');
  return value;
}

function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with ${result.status ?? 'a signal'}`);
}

function releaseIos(version: string, build: string): void {
  requireEnv(['MIU_APPLE_TEAM_ID']);
  const team = process.env.MIU_APPLE_TEAM_ID ?? '';
  if (!/^[A-Z0-9]{10}$/.test(team)) fail('MIU_APPLE_TEAM_ID must be the 10-character Apple team id');
  const archive = path.join(MOBILE_DIR, 'ios/build/MiuWorld.xcarchive');
  run(
    'xcodebuild',
    [
      '-project', 'App/App.xcodeproj', '-scheme', 'App', '-configuration', 'Release',
      '-destination', 'generic/platform=iOS', '-archivePath', archive,
      `MARKETING_VERSION=${version}`, `CURRENT_PROJECT_VERSION=${build}`,
      `DEVELOPMENT_TEAM=${team}`, 'CODE_SIGN_STYLE=Automatic', '-allowProvisioningUpdates',
      'archive',
    ],
    path.join(MOBILE_DIR, 'ios'),
  );
  console.log(`release: archived ${version} (${build}) at ${path.relative(MOBILE_DIR, archive)}; upload it from Xcode Organizer or with the App Store Connect API key`);
}

function releaseAndroid(version: string, build: string): void {
  requireEnv(['MIU_ANDROID_KEYSTORE', 'MIU_ANDROID_KEYSTORE_PASSWORD', 'MIU_ANDROID_KEY_ALIAS', 'MIU_ANDROID_KEY_PASSWORD']);
  if (!existsSync(process.env.MIU_ANDROID_KEYSTORE ?? '')) fail('MIU_ANDROID_KEYSTORE does not name an existing file');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(gradlew, ['--no-daemon', `-PmiuVersionName=${version}`, `-PmiuVersionCode=${build}`, 'bundleRelease'], path.join(MOBILE_DIR, 'android'));
  console.log(`release: built ${version} (${build}) at android/app/build/outputs/bundle/release/app-release.aab`);
}

const platform = process.argv[2];
const version = appVersion();
const build = buildNumber();
if (platform === 'ios') releaseIos(version, build);
else if (platform === 'android') releaseAndroid(version, build);
else fail('usage: release.ts ios|android');
