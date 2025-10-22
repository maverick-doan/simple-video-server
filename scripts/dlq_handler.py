import json
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Simple DLQ handler for failed transcoding jobs
    Logs failed messages and sends notifications
    """
    
    logger.info(f"Received {len(event['Records'])} DLQ messages")
    
    failed_jobs = []
    
    for record in event['Records']:
        try:
            # Parse the SQS message
            message_body = json.loads(record['body'])
            
            # Extract job information
            job_id = message_body.get('jobId', 'unknown')
            video_id = message_body.get('videoId', 'unknown')
            owner_id = message_body.get('ownerId', 'unknown')
            
            logger.error(f"Failed transcoding job - JobID: {job_id}, VideoID: {video_id}, OwnerID: {owner_id}")
            
            failed_jobs.append({
                'jobId': job_id,
                'videoId': video_id,
                'ownerId': owner_id,
                'failureReason': 'Job failed after 3 retries',
                'timestamp': record['attributes']['SentTimestamp']
            })
            
        except Exception as e:
            logger.error(f"Error processing DLQ message: {str(e)}")
            logger.error(f"Raw message: {record}")
    
    # Log summary
    logger.info(f"Processed {len(failed_jobs)} failed jobs")
    
    if failed_jobs:
        logger.warning(f"ALERT: {len(failed_jobs)} transcoding jobs failed and moved to DLQ")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': f'Processed {len(failed_jobs)} failed jobs',
            'failedJobs': failed_jobs
        })
    }