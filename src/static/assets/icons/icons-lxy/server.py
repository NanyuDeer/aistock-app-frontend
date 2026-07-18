"""
图标素材库本地服务器
运行方式: python server.py
访问地址: http://localhost:8088/

功能:
- 静态文件服务
- /api/icons 接口: 返回当前目录所有 SVG 图标列表
- 新增 SVG 文件后刷新页面自动显示
"""

import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = 8088
ICON_DIR = os.path.dirname(os.path.abspath(__file__))


class IconGalleryHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ICON_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        
        # API 接口: 返回图标列表
        if parsed.path == '/api/icons':
            self.send_icon_list()
            return
        
        # 其他请求走默认静态文件服务
        super().do_GET()

    def send_icon_list(self):
        try:
            svg_files = []
            for filename in os.listdir(ICON_DIR):
                if filename.endswith('.svg') and os.path.isfile(os.path.join(ICON_DIR, filename)):
                    svg_files.append(filename)
            
            svg_files.sort()
            
            response = {
                'success': True,
                'total': len(svg_files),
                'icons': svg_files
            }
            
            body = json.dumps(response, ensure_ascii=False).encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', len(body))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            
        except Exception as e:
            error = json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(error)

    def log_message(self, format, *args):
        # 简化日志输出
        print(f"[{self.command}] {self.path}")


def main():
    server = HTTPServer(('0.0.0.0', PORT), IconGalleryHandler)
    print(f"=" * 50)
    print(f"  图标素材库服务器已启动")
    print(f"  访问地址: http://localhost:{PORT}/")
    print(f"  图标目录: {ICON_DIR}")
    print(f"=" * 50)
    print(f"  新增 SVG 文件后刷新页面即可自动显示")
    print(f"  按 Ctrl+C 停止服务器")
    print(f"=" * 50)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.server_close()


if __name__ == '__main__':
    main()
