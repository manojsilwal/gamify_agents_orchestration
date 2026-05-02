import { useState, useEffect } from 'react';

const WEBSOCKET_URL = "ws://localhost:8080";

export function useZenithData() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [portfolioData, setPortfolioData] = useState<any>(null);
    const [optimizationResult, setOptimizationResult] = useState<any>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {
            console.log('Connected to Zenith Backend WS');
            socket.send(JSON.stringify({ type: 'REQUEST_ZENITH_DATA' }));
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'ZENITH_DATA_UPDATE') {
                setDashboardData(message.data.dashboard);
                setPortfolioData(message.data.portfolio);
            } else if (message.type === 'OPTIMIZATION_RESULT') {
                setOptimizationResult(message.data.result);
            }
        };

        socket.onclose = () => {
            console.log('Disconnected from Zenith Backend WS');
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, []);

    const calculateOptimization = (amount: number, source: string, destination: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            setOptimizationResult(null); // Clear previous
            ws.send(JSON.stringify({
                type: 'CALCULATE_OPTIMIZATION',
                data: { amount, source, destination }
            }));
        }
    };

    const linkAccount = (provider: string, credentials: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'LINK_ACCOUNT',
                data: { provider, credentials }
            }));
        }
    };

    return { dashboardData, portfolioData, optimizationResult, calculateOptimization, linkAccount };
}
