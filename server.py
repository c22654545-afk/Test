#!/usr/bin/env python3
import os
import json
import urllib.parse
import urllib.request
import urllib.error
import time
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

class FeedbackHandler(SimpleHTTPRequestHandler):
    # Simple in-memory rate limiting (per IP)
    rate_limit_storage = {}
    MAX_REQUESTS_PER_MINUTE = 5
    MAX_CONTENT_LENGTH = 4096  # 4KB max
    
    def do_GET(self):
        # Handle static file serving
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path == '/submit-feedback':
            self.handle_feedback()
        else:
            self.send_error(404)

    def check_rate_limit(self, client_ip):
        current_time = time.time()
        
        # Clean old entries (older than 1 minute)
        for ip in list(self.rate_limit_storage.keys()):
            self.rate_limit_storage[ip] = [
                timestamp for timestamp in self.rate_limit_storage[ip] 
                if current_time - timestamp < 60
            ]
            if not self.rate_limit_storage[ip]:
                del self.rate_limit_storage[ip]
        
        # Check current IP
        if client_ip in self.rate_limit_storage:
            if len(self.rate_limit_storage[client_ip]) >= self.MAX_REQUESTS_PER_MINUTE:
                return False
            self.rate_limit_storage[client_ip].append(current_time)
        else:
            self.rate_limit_storage[client_ip] = [current_time]
        
        return True

    def validate_email(self, email):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def handle_feedback(self):
        try:
            # Check rate limiting
            client_ip = self.client_address[0]
            if not self.check_rate_limit(client_ip):
                self.send_json_response({'success': False, 'message': 'Too many requests. Please wait before submitting again.'}, 429)
                return

            # Check content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > self.MAX_CONTENT_LENGTH:
                self.send_json_response({'success': False, 'message': 'Request too large'}, 413)
                return
            
            # Read the POST data
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            # Parse form data
            parsed_data = urllib.parse.parse_qs(post_data)
            
            name = parsed_data.get('name', [''])[0].strip()
            email = parsed_data.get('email', [''])[0].strip()
            feedback = parsed_data.get('feedback', [''])[0].strip()
            
            # Server-side validation
            if not name or not email or not feedback:
                self.send_json_response({'success': False, 'message': 'All fields are required'}, 400)
                return
            
            if len(name) > 100:
                self.send_json_response({'success': False, 'message': 'Name too long (max 100 characters)'}, 400)
                return
                
            if len(email) > 254:
                self.send_json_response({'success': False, 'message': 'Email too long'}, 400)
                return
                
            if len(feedback) > 2000:
                self.send_json_response({'success': False, 'message': 'Feedback too long (max 2000 characters)'}, 400)
                return
            
            if not self.validate_email(email):
                self.send_json_response({'success': False, 'message': 'Please enter a valid email address'}, 400)
                return
            
            # Send to Discord
            success = self.send_to_discord(name, email, feedback)
            
            if success:
                self.send_json_response({'success': True, 'message': 'Feedback sent successfully!'})
            else:
                self.send_json_response({'success': False, 'message': 'Failed to send feedback'}, 500)
                
        except Exception as e:
            print(f"Error handling feedback: {e}")
            self.send_json_response({'success': False, 'message': 'Server error'}, 500)

    def send_to_discord(self, name, email, feedback):
        try:
            webhook_url = os.environ.get('DISCORD_WEBHOOK_URL')
            if not webhook_url:
                print("Discord webhook URL not configured")
                return False

            print(f"Attempting to send to Discord webhook...")

            # Create Discord embed payload with no mentions
            payload = {
                'content': '**New Feedback Received!**',
                'allowed_mentions': {'parse': []},
                'embeds': [{
                    'title': 'Portfolio Feedback',
                    'color': 0x667eea,
                    'fields': [
                        {
                            'name': '👤 Name',
                            'value': name[:100],  # Limit field length
                            'inline': True
                        },
                        {
                            'name': '📧 Email',
                            'value': email[:100],
                            'inline': True
                        },
                        {
                            'name': '💬 Feedback',
                            'value': feedback[:1000],  # Limit feedback display
                            'inline': False
                        }
                    ],
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'footer': {
                        'text': 'Portfolio Feedback System'
                    }
                }]
            }

            # Send to Discord
            data = json.dumps(payload).encode('utf-8')
            print(f"Payload size: {len(data)} bytes")
            
            req = urllib.request.Request(
                webhook_url,
                data=data,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Portfolio-Feedback-System/1.0'
                }
            )
            
            with urllib.request.urlopen(req) as response:
                response_code = response.getcode()
                print(f"Discord webhook response: {response_code}")
                if response_code in [200, 204]:
                    print(f"Feedback sent to Discord successfully")
                    return True
                else:
                    print(f"Unexpected response code: {response_code}")
                    return False
                    
        except urllib.error.HTTPError as e:
            print(f"HTTP Error sending to Discord: {e.code} - {e.reason}")
            if hasattr(e, 'read'):
                error_body = e.read().decode('utf-8')
                print(f"Error response body: {error_body}")
            return False
        except Exception as e:
            print(f"Error sending to Discord: {e}")
            return False

    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
          
