// const bcrypt = require('bcrypt');
// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');

// const dbPath = path.resolve(__dirname, 'database.db');

 
// const authentication = async ({ username, password }) => {
//   const db = await dbinit();
//   // Select the user with the matching username
//   const sql = 'SELECT * FROM users WHERE username = ?';
//   return new Promise((resolve, reject) => {
//     db.get(sql, [username], async (err, user) => {
//       db.close();
//       if (err) {
//         return reject(err);
//       }
//       // no user found
//       if (!user) {
//         return resolve(null);
//       }
//       // compare the provided password with the hashed password in the database
//       try {
//         const match = await bcrypt.compare(password, user.password);
//         if (match) {
//           // password matches, return user data without the password
//           const { password, ...userData } = user;
//           return resolve(userData);
//         } else {
//           // password does not match
//           return resolve(null);
//         }
//       } catch (compareError) {
//         return reject(compareError);
//       }
//     });
//   });
// };

// const signup = async ({ username, password }) => {
//   const db = await dbinit();
//   // add the user and password to the database
//   const hash = await bcrypt.hash(password, 10);
//   const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
//   try {
//     db.run(sql,[username,hash]);
//     db.close();
//     return true;
//   }
//   catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

// const dbinit = async () => {
//   try {
//     const db = await new sqlite3.Database(dbPath);
//     const sql = `CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT NOT NULL UNIQUE,
//       password TEXT NOT NULL,
//       salt TEXT,
//       twoFactorSecret TEXT
//     )`;
//     db.run(sql); 
//     return db;
//   }
//   catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

// module.exports = {
//   authenticate: authentication,
//   signup: signup
// };


const { authenticator } = require('otplib');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');

const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

const signup = async ({ username, password }) => {
  const db = await dbinit();
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    //wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
    const secret = authenticator.generateSecret();
    const manualKey = secret;
    const encryptionKey = crypto.randomBytes(32).toString('hex');// Generate a new key
    const { encryptedSecret, iv } = encryptSecret(secret, encryptionKey);
    console.log(encryptionKey);
    const encryptSecret = (secret, encryptionKey) => {
      const iv = crypto.randomBytes(16); // Initialization vector for AES
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return { encryptedSecret: encrypted, iv: iv.toString('hex') };
    };
// Add to your signup function
 // Define encryptionKey elsewhere and securely
    //wwwwwwwwwwwwwwwwwwwwwwwwwwww
    const sql = 'INSERT INTO users (username, password, salt,twoFactorSecret, iv) VALUES (?, ?, ?, ?, ?)';
    await new Promise((resolve, reject) => {
      db.run(sql, [username, hash, salt, secret, iv], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
    db.close();
    return true;
  } catch (err) {
    console.error("Error in signup function: ", err);
    db.close();
    throw err;
  }
};
const authentication = async ({ username, password }) => {
  const db = await dbinit();
  const sql = 'SELECT * FROM users WHERE username = ?';
  return new Promise((resolve, reject) => {
    db.get(sql, [username], (err, user) => {
      db.close();
      if (err) {
        console.error("Error fetching user:", err);
        return reject(err);
      }
      if (!user) {
        console.log("User not found:", username);
        return resolve({ success: false, message: "User not found" });
      }
      if (user.salt) {
        const hash = hashPassword(password, user.salt);
        console.log('Hashed password attempt: ', hash);
        console.log('Stored hash: ', user.password);
        if (hash === user.password) {
          console.log('User ', username, ' authenticated successfully.');
          const { password, salt, ...userData } = user;
          return resolve({ success: true, data: userData });
        } else {
          console.log('Authentication failed for user ${username}: Incorrect password.');
          return resolve({ success: false, message: "Incorrect password" });
        }
      } else {
        console.log("Salt not found for user:", username);
        return resolve({ success: false, message: "Salt not found" });
      }
    });
  });
};

const dbinit = async () => {
  const db = new sqlite3.Database(dbPath);
  const sql = `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          salt TEXT,
          twoFactorSecret TEXT,
          iv TEXT
          
         )`;
  db.run(sql);
  return db;
};

module.exports = {
  authenticate: authentication,
  signup: signup
};