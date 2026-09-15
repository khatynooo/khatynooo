import os, re

files = []
for root, dirs, fnames in os.walk('server'):
    for f in fnames:
        if f.endswith('.ts'):
            files.append(os.path.join(root, f))
files.append('server.ts')

keywords = ['chat_id', 'eitaa_user_id', 'receipt_code', 'order_number', 'customer_id']

for fpath in files:
    with open(fpath, 'r', errors='ignore') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        for kw in keywords:
            if kw in line and ('SELECT' in line or 'WHERE' in line or 'UPDATE' in line or '$' in line):
                print(f"{fpath}:{i+1}: {line.strip()}")
