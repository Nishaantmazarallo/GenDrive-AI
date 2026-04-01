#!/bin/bash
# Development runner script - starts both backend and frontend

echo "Starting GenDrive AI Development Environment..."
echo ""

# Start backend in background
echo "🚀 Starting Backend Server on port 5000..."
cd backend
npm start &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo ""

# Give backend time to start
sleep 2

# Start frontend
echo "⚛️  Starting Frontend Server on port 3000..."
cd ../frontend
echo "Frontend will open at http://localhost:3000"
echo ""
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
