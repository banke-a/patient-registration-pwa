// main.js

// Generate a simple UUID (sufficient for demo purposes)
function generateUUID() { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, 
          v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

// Retrieve stored submissions from localStorage
function getStoredSubmissions() {
  let submissions = localStorage.getItem('patientSubmissions');
  return submissions ? JSON.parse(submissions) : [];
}

// Store a submission locally
function storeSubmission(submission) {
  let submissions = getStoredSubmissions();
  submissions.push(submission);
  localStorage.setItem('patientSubmissions', JSON.stringify(submissions));
}

// Clear stored submissions after successful sync
function clearStoredSubmissions() {
  localStorage.removeItem('patientSubmissions');
}

// Send a submission to the backend (Google Apps Script web app)
function sendSubmission(submission) {
  return fetch('https://script.google.com/macros/s/AKfycbxVcPIUbilKyUqUYXRPC8PTe-zl_ceADc3mkcmvkJomb4ddXCVTQn4JH-8fCPSraSUNOw/exec', {
    method: 'POST',
    mode: 'cors', // ensures CORS is used
    headers: { 'Content-Type': 'text/plain' },  // use text/plain to avoid preflight
    body: JSON.stringify(submission)
  });
}


// Sync all stored submissions when online
async function syncSubmissions() {
  let submissions = getStoredSubmissions();
  if (submissions.length === 0) return;
  
  for (let submission of submissions) {
    try {
      await sendSubmission(submission);
      console.log('Synced submission:', submission.uuid);
    } catch (error) {
      console.error('Error syncing submission:', error);
      return; // Exit if an error occurs
    }
  }
  clearStoredSubmissions();
  document.getElementById('status').innerText = 'All submissions synced!';
}

// Handle form submission
document.getElementById('registrationForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submission = {
    uuid: generateUUID(),
    name: document.getElementById('name').value,
    age: parseInt(document.getElementById('age').value, 10),
    contact: document.getElementById('contact').value,
    timestamp: new Date().toISOString()
  };

  if (navigator.onLine) {
    sendSubmission(submission).then(() => {
      document.getElementById('status').innerText = 'Submission sent successfully!';
    }).catch(err => {
      console.error('Send error, storing locally:', err);
      storeSubmission(submission);
      document.getElementById('status').innerText = 'Offline: Stored locally, will sync when online.';
    });
  } else {
    storeSubmission(submission);
    document.getElementById('status').innerText = 'Offline: Stored locally, will sync when online.';
  }
  
  // Clear form fields
  document.getElementById('registrationForm').reset();
});

// Listen for online event to trigger sync
window.addEventListener('online', syncSubmissions);

// Register the Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker registered with scope:', reg.scope))
    .catch(err => console.error('Service Worker registration failed:', err));
}
