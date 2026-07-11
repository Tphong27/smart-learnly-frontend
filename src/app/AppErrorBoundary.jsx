import React from "react";

/**
 * App-wide ErrorBoundary that swallows React 19's dev overlay and renders
 * a friendly message + reload button instead. This prevents a single
 * buggy component from blocking the whole admin shell.
 */
export class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error("AppErrorBoundary caught", error, info);
    }

    handleReset = () => {
        this.setState({ error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        const error = this.state.error;
        const message =
            error?.message || "Something went wrong while rendering this page.";
        const stack = error?.stack || "";

        return (
            <div
                role="alert"
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 12,
                    padding: "40px 24px",
                    fontFamily:
                        "'Lato', ui-sans-serif, system-ui, sans-serif",
                    color: "#17233e",
                    background: "#f7f9fc",
                    overflowY: "auto",
                }}
            >
                <h1 style={{ margin: 0, fontSize: 22 }}>
                    We hit an unexpected error
                </h1>
                <p
                    style={{
                        margin: 0,
                        maxWidth: 720,
                        textAlign: "center",
                        color: "#64708a",
                    }}
                >
                    {message}
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        type="button"
                        onClick={this.handleReset}
                        style={{
                            padding: "10px 18px",
                            border: "1px solid #d8c8fb",
                            background: "#ffffff",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Try again
                    </button>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        style={{
                            padding: "10px 18px",
                            border: "1.5px solid #211b36",
                            background: "#825ef5",
                            color: "#ffffff",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 700,
                            boxShadow: "3px 3px 0 #211b36",
                        }}
                    >
                        Reload page
                    </button>
                </div>
                {stack && (
                    <details
                        style={{
                            marginTop: 12,
                            maxWidth: 900,
                            width: "100%",
                        }}
                    >
                        <summary
                            style={{
                                cursor: "pointer",
                                color: "#64708a",
                                fontWeight: 600,
                            }}
                        >
                            Show stack trace
                        </summary>
                        <pre
                            style={{
                                background: "#0f172a",
                                color: "#f7f9fc",
                                padding: 16,
                                borderRadius: 10,
                                overflow: "auto",
                                fontSize: 12,
                                lineHeight: 1.5,
                                maxHeight: 320,
                                marginTop: 8,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {stack}
                        </pre>
                    </details>
                )}
            </div>
        );
    }
}