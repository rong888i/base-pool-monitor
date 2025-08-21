// 使用环境变量配置后端API地址，如果没有配置则使用默认值
const API_BASE_URL = process.env.POOL_MONITOR_API_URL || 'http://107.175.36.39:6786';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path') || '';
        const url = `${API_BASE_URL}${path}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('API转发错误:', error);
        return Response.json(
            { error: 'API请求失败', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path') || '';
        const url = `${API_BASE_URL}${path}`;

        const body = await request.json();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('API转发错误:', error);
        return Response.json(
            { error: 'API请求失败', message: error.message },
            { status: 500 }
        );
    }
} 