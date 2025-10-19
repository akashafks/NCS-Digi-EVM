# NCS Digital EVM (Electronic Voting Machine)

A modern, secure, and user-friendly digital voting system built with React, TypeScript, and Electron.

## 🚀 Features

- **Secure Voting Interface**: Clean, intuitive voting experience
- **Admin Panel**: Complete booth management system
- **Real-time Results**: Live vote counting and result visualization
- **Token-based Authentication**: Secure voting with unique tokens
- **Data Export**: Export results to Excel format
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Offline Capable**: No internet connection required

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/akashafks/NCS-Digi-EVM.git
   cd NCS-Digi-EVM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🏗️ Building for Production

### Web Application
```bash
npm run build
```

### Desktop Application (Electron)
```bash
npm run build:electron
```

## 📱 Usage

### Admin Panel
1. Launch the application
2. Enter admin password to access the control panel
3. Create voting booths with candidates
4. Configure voting settings and tokens
5. Start/stop voting sessions
6. View real-time results

### Voting Interface
1. Navigate to the voting booth
2. Enter your voting token (if enabled)
3. Select your preferred candidates
4. Submit your vote securely

## 🏛️ Project Structure

```
NCS-Digi-EVM/
├── src/
│   ├── components/          # React components
│   │   ├── AdminPanel.tsx
│   │   ├── VotingInterface.tsx
│   │   ├── Results.tsx
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── dataApi.ts
│   │   ├── export.ts
│   │   └── tokens.ts
│   ├── types/              # TypeScript definitions
│   └── App.tsx             # Main application
├── data/                   # Local data storage
│   ├── booths/            # Voting booth data
│   └── settings.json      # Application settings
├── dist/                  # Built application
└── main.js               # Electron main process
```

## 🔧 Configuration

### Admin Password
Set the admin password in `data/settings.json`:
```json
{
  "adminPassword": "your-secure-password"
}
```

### Voting Booths
- Create multiple voting booths for different elections
- Configure candidate lists and positions
- Enable/disable token-based authentication
- Set voting time limits

## 📊 Data Management

### Vote Storage
- Votes are stored locally in JSON format
- Each booth maintains separate vote records
- Automatic backup and data integrity checks

### Export Options
- Export results to Excel format
- Generate detailed voting reports
- Backup voting data

## 🔒 Security Features

- **Password Protection**: Admin access control
- **Token Authentication**: Unique voting tokens
- **Data Integrity**: Secure vote storage
- **Audit Trail**: Complete voting history
- **Offline Operation**: No external dependencies

## 🚀 Deployment

### Desktop Application
1. Build the Electron application
2. Distribute the installer package
3. Install on voting machines
4. Configure network settings (if needed)

### Web Application
1. Build the React application
2. Deploy to web server
3. Configure HTTPS for security
4. Set up proper authentication

## 📝 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run build:electron` - Build Electron app
- `npm run electron` - Run Electron app

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Desktop**: Electron
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Data**: Local JSON storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Akash** - *Initial work* - [akashafks](https://github.com/akashafks)

## 🙏 Acknowledgments

- Built for Navy Children School
- Modern voting system for educational institutions
- Secure and transparent voting process

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Made with ❤️ for transparent and secure voting**
