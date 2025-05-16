const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file for all routes (SPA style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mobile app preview server running on port ${PORT}`);
  console.log(`Open the app at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/MobileApp`);
});