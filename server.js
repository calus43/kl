const express = require('express');
const multer = require('multer');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  whatsapp: String,
  photoUrl: String,
  latitude: Number,
  longitude: Number,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_photos',
    allowed_formats: ['jpg', 'png']
  }
});
const upload = multer({ storage: storage });

app.post('/submit', upload.single('photo'), async (req, res) => {
  const { whatsapp, latitude, longitude } = req.body;
  const photoUrl = req.file.path;

  const user = new User({ whatsapp, photoUrl, latitude, longitude });
  await user.save();

  res.sendStatus(200);
});

app.get('/admin', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const markers = users.map(u => ({
    lat: u.latitude,
    lng: u.longitude,
    whatsapp: u.whatsapp,
    photoUrl: u.photoUrl
  }));

  const html = `
    <html>
    <head>
      <title>Admin Dashboard</title>
      <style> body, html { margin: 0; height: 100%; } #map { height: 100%; width: 100%; } </style>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDfcxqKwLi2RgjZwfHEV6MyEacLLrZDX0g"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        function initMap() {
          const map = new google.maps.Map(document.getElementById('map'), {
            zoom: 4,
            center: { lat: 20.5937, lng: 78.9629 }
          });

          const markers = ${JSON.stringify(markers)};
          markers.forEach(data => {
            const marker = new google.maps.Marker({
              position: { lat: data.lat, lng: data.lng },
              map: map
            });
            const info = new google.maps.InfoWindow({
              content: "<b>WhatsApp:</b> " + data.whatsapp + "<br/><img src='" + data.photoUrl + "' width='100' />"
            });
            marker.addListener('click', () => info.open(map, marker));
          });
        }
        window.onload = initMap;
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

app.listen(3000, () => console.log('Server running on port 3000'));
