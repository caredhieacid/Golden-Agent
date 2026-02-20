import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  captchaId: string | null;
  svg: string | null;
  onRefresh: () => Promise<void>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Captcha({ captchaId, svg, onRefresh, value, onChange, disabled }: CaptchaProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {svg ? (
          <div
            className="h-12 w-36 overflow-hidden rounded border border-border bg-muted"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-12 w-36 items-center justify-center rounded border border-border bg-muted">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={disabled || loading}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="验证码"
        disabled={disabled}
        className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        maxLength={6}
        autoComplete="off"
      />
      <input type="hidden" name="captchaId" value={captchaId || ''} />
    </div>
  );
}

export function useCaptcha() {
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const response = await fetch('/api/auth/captcha');
      const data = await response.json();
      setCaptchaId(data.captchaId);
      setSvg(data.svg);
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { captchaId, svg, refresh };
}
