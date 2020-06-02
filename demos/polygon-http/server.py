# Dummy server that receives a polygon and resend one
# Replace in it whatever algorithm you want

from http.server import BaseHTTPRequestHandler, HTTPServer
from json import dumps, loads

""" The HTTP request handler """
class RequestHandler(BaseHTTPRequestHandler):

  def _send_cors_headers(self):
      """ Sets headers required for CORS """
      self.send_header("Access-Control-Allow-Origin", "*")
      self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
      self.send_header("Access-Control-Allow-Headers", "x-api-key,Content-Type")

  def send_dict_response(self, d):
      """ Sends a dictionary (JSON) back to the client """
      self.wfile.write(bytes(dumps(d), "utf8"))

  def do_OPTIONS(self):
      self.send_response(200)
      self._send_cors_headers()
      self.end_headers()

  def do_GET(self):
      self.send_response(200)
      self._send_cors_headers()
      self.end_headers()

      response = {}
      response["status"] = "OK"
      self.send_dict_response(response)

  def do_POST(self):
      """Dummy POST request changing input polygon color
      """
      self.send_response(200)
      self._send_cors_headers()
      self.send_header("Content-Type", "application/json")
      self.end_headers()

      dataLength = int(self.headers["Content-Length"])
      data = self.rfile.read(dataLength)
      decoded = data.decode('utf-8')
      response = loads(decoded)
      response["polygon"]["color"] = "pink"
      print('response:', response)
      self.send_dict_response(response)


print("Starting server")
httpd = HTTPServer(("127.0.0.1", 4000), RequestHandler)
print("Hosting server on port 4000")
httpd.serve_forever()