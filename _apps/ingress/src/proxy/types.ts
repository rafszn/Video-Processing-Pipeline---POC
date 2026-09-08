export interface ProxyConfig {
  id: string;
  target: string;
  timeout?: number;
  serviceName: string;
  changeOrigin?: boolean;
}
