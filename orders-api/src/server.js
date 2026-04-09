require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Orders API corriendo en puerto ${PORT}`));