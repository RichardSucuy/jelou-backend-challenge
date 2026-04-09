require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Customers API corriendo en puerto ${PORT}`));