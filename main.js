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

// Overwrite stored submissions
function setStoredSubmissions(submissions) {
  localStorage.setItem('patientSubmissions', JSON.stringify(submissions));
}

// Clear all stored submissions
function clearStoredSubmissions() {
  localStorage.removeItem('patientSubmissions');
}

// Send a submission to the backend (Google Apps Script web app)
// Using no-cors mode so the request is "simple"
// Note: The response will be opaque.
function sendSubmission(submission) {
  return fetch('https://script.google.com/macros/s/AKfycbxVcPIUbilKyUqUYXRPC8PTe-zl_ceADc3mkcmvkJomb4ddXCVTQn4JH-8fCPSraSUNOw/exec', {
    method: 'POST',
    mode: 'no-cors',  // no-cors avoids preflight issues
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(submission)
  });
}

// Sync all stored submissions when online
async function syncSubmissions() {
  let submissions = getStoredSubmissions();
  if (submissions.length === 0) return;
  
  // For each stored submission, try sending it
  for (let submission of submissions) {
    try {
      await sendSubmission(submission);
      console.log('Synced submission:', submission.uuid);
    } catch (error) {
      console.error('Error syncing submission:', error);
      return; // exit if an error occurs, will try again on next online event
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

  // Always store the submission immediately
  storeSubmission(submission);

  // If online, try sending all stored submissions
  if (navigator.onLine) {
    sendSubmission(submission).then(() => {
      document.getElementById('status').innerText = 'Submission sent successfully!';
      // Remove this submission from storage
      let submissions = getStoredSubmissions();
      submissions = submissions.filter(s => s.uuid !== submission.uuid);
      setStoredSubmissions(submissions);
    }).catch(err => {
      console.error('Send error, will try syncing later:', err);
      document.getElementById('status').innerText = 'Submission stored locally, will sync when online.';
    });
  } else {
    document.getElementById('status').innerText = 'Offline: Stored locally, will sync when online.';
  }
  
  // Clear form fields
  document.getElementById('registrationForm').reset();
});

// Listen for online events to trigger sync of all stored submissions
window.addEventListener('online', syncSubmissions);

// Register the Service Worker for offline caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker registered with scope:', reg.scope))
    .catch(err => console.error('Service Worker registration failed:', err));
}
