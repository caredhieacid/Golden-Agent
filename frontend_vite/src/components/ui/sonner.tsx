
// But I haven't installed next-themes in frontend_vite. I should check if I installed it.
// I installed tailwindcss-animate etc but forgot next-themes?
// Actually I don't need next-themes if I implement dark mode manually or use a simple provider.
// But Sonner component uses it.
// I'll replace useTheme with a simple stub or remove theme prop for now, or install next-themes.
// Vite supports next-themes (it works in React generally).
// I'll install next-themes later. For now I keep it.

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
