import os

path = r"app\(app)\Activities\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('<datalist id={list-}>', '<datalist id={list-}>')
c = c.replace('list={list-}', 'list={list-}')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
