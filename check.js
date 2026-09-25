async function check() {
  try {
    const res = await fetch('http://localhost:3001/catalog/categories');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}
check();
