import urllib.request
import re

for filepath in ['c:/Users/pvish/Zyvionix/Omni Projects/omni-boq-frontend/app/superadmin/Activities/page.tsx', 'c:/Users/pvish/Zyvionix/Omni Projects/omni-boq-frontend/app/(app)/Activities/page.tsx']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will use simple substring replacements to avoid regex parsing issues
    # Find the Columns array inside the file
    start_idx = content.find('const columns')
    if start_idx != -1:
        end_idx = content.find('];', start_idx)
        if end_idx != -1:
            columns_str = content[start_idx:end_idx+2]
            new_columns_str = re.sub(r'\{\s*field:\s*\"materialCost\".*?\},', '', columns_str, flags=re.DOTALL)
            new_columns_str = re.sub(r'\{\s*field:\s*\"labourCost\".*?\},', '', new_columns_str, flags=re.DOTALL)
            new_columns_str = re.sub(r'\{\s*headerName:\s*\"Total Price.*?valueFormatter.*?,[^}]*\},', '', new_columns_str, flags=re.DOTALL)
            
            content = content[:start_idx] + new_columns_str + content[end_idx+2:]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
