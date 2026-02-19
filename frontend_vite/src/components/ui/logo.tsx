
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 40"
            fill="currentColor"
            className={cn("h-8 w-auto", className)}
            {...props}
        >
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fontFamily="'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
                fontWeight="900"
                fontSize="28"
                letterSpacing="4"
            >
                天枢
            </text>
        </svg>
    );
}
