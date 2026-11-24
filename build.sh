#!/usr/bin/env bash
# Exit immediately on error
set -o errexit

echo "==> Building React Frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Installing Python Backend Dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Build completed successfully!"
