export interface ProxyConfig {
  target: string;
  timeout?: number;
  serviceName: string;
  changeOrigin?: boolean;
}
