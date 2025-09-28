import asyncio
import aiohttp
import os
import time
import argparse
import sys

BASE_URL = os.getenv("API_URL", "http://n11562773.cab432.com:3000")
USER = os.getenv("API_USER", "admin")
PASSWORD = os.getenv("API_USER_PASSWORD", "admin123")
CONCURRENCY = int(os.getenv("CONCURRENCY", "4"))
REQUESTS = int(os.getenv("REQUESTS", "10"))
VIDEO_PATH = os.getenv("VIDEO_PATH", "test.mp4")

async def login(session: aiohttp.ClientSession) -> str:
    body = {
        "username": USER,
        "password": PASSWORD
    }

    async with session.post(f"{BASE_URL}/api/auth/login", json=body) as resp:
        print(await resp.json())
        if resp.status != 200:
            raise Exception(f'Login failed: {resp.status}')
        data = await resp.json()
        return data['token']

async def upload_video(session: aiohttp.ClientSession, token: str, video_path: str, title: str = "Test Video", description: str = "Uploaded via test script") -> str:
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    mime_type = 'video/mp4'
    data = aiohttp.FormData()
    data.add_field('title', title)
    data.add_field('description', description)
    data.add_field('type', mime_type)
    filename = os.path.basename(video_path)
    data.add_field('originalName', filename)
    with open(video_path, 'rb') as f:
        file_content = f.read()
        data.add_field('file', file_content, filename=filename, content_type='video/mp4')
    
    headers = {'Authorization': f'Bearer {token}'}

    async with session.post(f'{BASE_URL}/api/video/upload', data=data, headers=headers) as resp:
        print(await resp.json())
        if resp.status != 201:
            error_text = await resp.text()
            raise Exception(f'Upload failed: {error_text}')
        data = await resp.json()
        video_id = data['video']['id']
        return video_id

async def request_transcode(session: aiohttp.ClientSession, token: str, video_id: str, qualities: list = None) -> str:
    if qualities is None:
        qualities = ['720p', '480p']
    
    transcode_data = {
        'videoId': video_id,
        'qualities': qualities
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    async with session.post(f'{BASE_URL}/api/video/transcode', json=transcode_data, headers=headers) as resp:
        print(await resp.json())
        if resp.status != 202:
            error_text = await resp.text()
            raise Exception(f'Transcode request failed: {error_text}')
        
        data = await resp.json()
        job_id = data['jobId']
        return job_id

async def check_job_status(session: aiohttp.ClientSession, token: str, job_id: str) -> dict:
    headers = {'Authorization': f'Bearer {token}'}
    
    async with session.get(f'{BASE_URL}/api/video/transcode/{job_id}', headers=headers) as resp:
        print(await resp.json())
        if resp.status != 200:
            error_text = await resp.text()
            raise Exception(f'Job status check failed: {error_text}')
        
        data = await resp.json()
        if 'transcodeJob' in data:
            return data['transcodeJob']
        return data

async def is_job_running(session: aiohttp.ClientSession, token: str, job_id: str) -> bool:
    try:
        headers = {'Authorization': f'Bearer {token}'}
        async with session.get(f'{BASE_URL}/api/video/transcode/{job_id}', headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                job = data.get('transcodeJob', {})
                status = job.get('status', 'unknown')
                return status in ['pending', 'processing']
            return False
    except:
        return False

async def load_test_transcode(session: aiohttp.ClientSession, token: str, video_id: str, concurrency: int, requests: int, duration_seconds: int = None, gradual_test: bool = False):
    async def submit_job():
        try:
            await request_transcode(session, token, video_id)
        except Exception as e:
            raise e
    
    if duration_seconds:
        print(f"Starting sustained load test: {duration_seconds}s duration with concurrency {concurrency}")
        
        start_time = time.time()
        count = 0
        running_jobs = set()
        
        while time.time() - start_time < duration_seconds:
            running_jobs = {job_id for job_id in running_jobs if await is_job_running(session, token, job_id)}
            
            if len(running_jobs) < concurrency:
                try:
                    job_id = await request_transcode(session, token, video_id)
                    running_jobs.add(job_id)
                    count += 1
                    print(f"Spawned job #{count} (ID: {job_id[:8]}...) - Running: {len(running_jobs)}/{concurrency}")
                except Exception as e:
                    print(f"Failed to spawn job: {e}")
            
            await asyncio.sleep(1)
            if gradual_test:
                await asyncio.sleep(5)
        print(f"Sustained load test completed: {count} jobs submitted over {duration_seconds}s")
        
    else:
        print(f"Starting load test: {requests} requests with concurrency {concurrency}")
        
        start_time = time.time()
        in_flight = []
        count = 0
        
        while count < requests:
            while len(in_flight) < concurrency and count < requests:
                task = asyncio.create_task(submit_job())
                in_flight.append(task)
                count += 1
            
            if in_flight:
                done, pending = await asyncio.wait(in_flight, return_when=asyncio.FIRST_COMPLETED)
                in_flight = list(pending)
        
        if in_flight:
            await asyncio.gather(*in_flight, return_exceptions=True)
        
        elapsed = time.time() - start_time
        print(f"Load test completed: {requests} jobs submitted in {elapsed:.2f}s")


async def main():
    parser = argparse.ArgumentParser(description='Test video upload and transcoding')
    parser.add_argument('--login', action='store_true', help='Login only')
    parser.add_argument('--video-path', help='Path to video file to upload')
    parser.add_argument('--video-id', help='Use existing video ID instead of uploading')
    parser.add_argument('--upload-only', action='store_true', help='Only upload, don\'t transcode')
    parser.add_argument('--load-test', action='store_true', help='Run load test after upload')
    parser.add_argument('--concurrency', type=int, default=CONCURRENCY, help='Concurrency for load test')
    parser.add_argument('--requests', type=int, default=REQUESTS, help='Number of requests for load test')
    parser.add_argument('--time', type=int, help='Duration in seconds for sustained load test')
    parser.add_argument('--check-job', help='Check status of specific job ID')
    parser.add_argument('--transcode-only', action='store_true', help='Only transcode, don\'t upload')
    parser.add_argument('--gradual-test', action='store_true', help='Gradually increase the number of requests')

    args = parser.parse_args()
    
    async with aiohttp.ClientSession() as session:
        try:
            print(f"Logging in as {USER}...")
            token = await login(session)
            print("Login successful!")
            
            if args.login:
                print("Login successful!")
                return
            
            if args.check_job:
                # Check specific job status
                job = await check_job_status(session, token, args.check_job)
                print(f"Job Status: {job['status']}")
                if 'outputMessage' in job and job['outputMessage']:
                    print(f"Output: {job['outputMessage']}")
                else:
                    print("Output: No output message available")
                return
            
            video_id = args.video_id
            
            if not video_id and not args.video_path:
                print("Error: Either --video-path or --video-id must be provided")
                sys.exit(1)
            
            if not video_id:
                # Upload video
                video_path = args.video_path or VIDEO_PATH
                if not video_path:
                    print("Error: No video path provided")
                    sys.exit(1)
                
                print(f"Uploading video: {video_path}")
                video_id = await upload_video(session, token, video_path)
            
            if args.upload_only:
                print("Upload completed. Exiting.")
                return
            
            # Request transcode
            if args.transcode_only:
                print("Requesting video transcoding...")
                job_id = await request_transcode(session, token, video_id)
                
                # Wait a bit and check status
                print("Waiting 5 seconds before checking job status...")
                await asyncio.sleep(5)
                
                job = await check_job_status(session, token, job_id)
                print(f"Job Status: {job['status']}")
                if 'outputMessage' in job and job['outputMessage']:
                    print(f"Output: {job['outputMessage']}")
                else:
                    print("Output: No output message available")
            
            if args.load_test:
                # Run load test
                if args.gradual_test:
                    await load_test_transcode(session, token, video_id, args.concurrency, args.requests, args.time, gradual_test=True)
                else:
                    await load_test_transcode(session, token, video_id, args.concurrency, args.requests, args.time)
            
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())