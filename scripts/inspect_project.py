import json
import subprocess
import os

def get_output(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT).strip()
    except Exception as e:
        return str(e)

print('Node:', get_output('node -v'))
print('npm:', get_output('npm -v'))
print('Git status:\n' + get_output('git status --short'))

with open('package.json', 'r', encoding='utf-8') as f:
    pkg = json.load(f)

deps = pkg.get('dependencies', {})
dev_deps = pkg.get('devDependencies', {})

target_keys = [
    'expo',
    'react',
    'react-dom',
    'react-native',
    'expo-router',
    'react-native-svg',
    'react-native-reanimated',
    'react-native-gesture-handler',
    'react-native-screens',
    'expo-notifications',
    '@react-native-async-storage/async-storage'
]

print('\n--- package.json declared versions ---')
for k in target_keys:
    val = deps.get(k, dev_deps.get(k, 'NOT DECLARED'))
    print(f'{k}: {val}')

print('\n--- Installed in node_modules ---')
for k in target_keys:
    parts = k.split('/')
    pkg_path = os.path.join('node_modules', *parts, 'package.json')
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r', encoding='utf-8') as f:
            installed = json.load(f)
            print(f'{k}: {installed.get("version")}')
    else:
        print(f'{k}: NOT FOUND in node_modules')
