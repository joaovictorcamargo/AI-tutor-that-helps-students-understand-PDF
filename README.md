# AI PDF Tutor

An interactive AI-powered PDF tutoring application that helps students understand documents through real-time chat and annotations.

## Technical Stack

- Next.js 14+ (App Router)
- Prisma with PostgreSQL (in-memory for development)
- OpenAI API for LLM integration
- Vercel AI SDK for AI features
- Browser's built-in Speech-to-Text/Text-to-Speech API
- Tailwind CSS for styling

## Core Features

### Authentication
- Email/password signup and login
- User session management

### PDF Viewer
- Split-screen layout with PDF view and chat
- PDF upload and storage
- Basic PDF navigation
- Real-time PDF annotations by AI

### AI Tutor Integration
- Real-time chat interface
- Voice input/output capability
- Chat history persistence
- Context-aware PDF navigation
- PDF content highlighting and annotation
- Context-aware responses

### Database Integration
- User data storage
- Chat history persistence
- PDF metadata storage
- Conversation context tracking

## Getting Started

### Prerequisites
- Node.js 18+
- npm/pnpm
- OpenAI API key

### Installation
1. Clone the repository
2. Install dependencies
3. Set up environment variables
4. Run development server

## Environment Variables

```env
DATABASE_URL=
OPENAI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Development

```bash
npm install
npm run dev
```

## License

This project is licensed under the MIT License.
