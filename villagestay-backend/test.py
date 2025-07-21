import boto3
import json
import time

def generate_single_video(prompt, bucket_name):
    """Generate a single video using async invoke"""
    
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    s3 = boto3.client('s3', region_name='us-east-1')
    
    # Model input
    model_input = {
        "taskType": "TEXT_VIDEO",
        "textToVideoParams": {
            "text": prompt,
            "durationSeconds": 6,
            "dimension": "1280x720"
        }
    }
    
    # Output config
    output_config = {
        "s3OutputDataConfig": {
            "s3Uri": f"s3://{bucket_name}/videos/"
        }
    }
    
    # Start job
    response = bedrock.start_async_invoke(
        modelId='amazon.nova-reel-v1:0',
        modelInput=json.dumps(model_input),
        outputDataConfig=output_config
    )
    
    invocation_arn = response['invocationArn']
    print(f"Job started: {invocation_arn}")
    
    # Wait for completion
    while True:
        status_response = bedrock.get_async_invoke(invocationArn=invocation_arn)
        status = status_response['status']
        
        print(f"Status: {status}")
        
        if status == 'Completed':
            print("✅ Video completed!")
            break
        elif status == 'Failed':
            print("❌ Generation failed")
            return None
        
        time.sleep(30)
    
    # Download result
    # List files in output location
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix='videos/')
    
    for obj in response.get('Contents', []):
        if obj['Key'].endswith('.mp4'):
            local_file = 'generated_video.mp4'
            s3.download_file(bucket_name, obj['Key'], local_file)
            print(f"✅ Downloaded: {local_file}")
            return local_file
    
    return None

# Usage
bucket = "bedrock-video-generation-us-east-1-4nfgpc"  # Replace with your bucket
prompt = "A cat walking gracefully through a blooming garden at sunset"
video = generate_single_video(prompt, bucket)