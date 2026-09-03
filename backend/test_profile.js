async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@seeker.edu', password: 'Password123' })
    });
    const auth = await loginRes.json();
    console.log('Login Status:', auth.token ? 'Success' : auth.message);

    // 2. Update Profile & Skills
    const updateRes = await fetch('http://localhost:5000/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        bio: 'Aspiring Full Stack Engineer',
        skillsTeach: ['Python', 'SQL', 'DBMS'],
        skillsLearn: ['React', 'Node.js', 'DSA']
      })
    });
    const result = await updateRes.json();
    console.log('Updated Profile Data:', result);
  } catch (err) {
    console.error('Test Error:', err.message);
  }
}

test();