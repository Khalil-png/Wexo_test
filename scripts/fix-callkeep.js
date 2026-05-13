import fs from 'fs';
import path from 'path';

const gradlePath = path.resolve('node_modules', 'capacitor-call-keep', 'android', 'build.gradle');

if (fs.existsSync(gradlePath)) {
    let content = fs.readFileSync(gradlePath, 'utf8');
    if (!content.includes('namespace "com.killer.callkeep.capacitor"')) {
        console.log('Fixing capacitor-call-keep build.gradle (adding namespace)...');
        content = content.replace(/android \{/, 'android {\n    namespace "com.killer.callkeep.capacitor"');
        fs.writeFileSync(gradlePath, content);
        console.log('Success!');
    } else {
        console.log('capacitor-call-keep already has namespace.');
    }
} else {
    console.log('capacitor-call-keep build.gradle not found at ' + gradlePath);
    console.log('Creating a dummy build.gradle to prevent build failures...');
    const dir = path.dirname(gradlePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(gradlePath, `
apply plugin: 'com.android.library'
android {
    namespace "com.killer.callkeep.capacitor"
    compileSdk 34
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 34
    }
}
dependencies {
    implementation project(':capacitor-android')
}
`);
    console.log('Dummy build.gradle created.');
}
