import pymongo
from pymongo import MongoClient
import sys
import certifi

# Source (local) connection
LOCAL_URL = "mongodb://localhost:27017/"
LOCAL_DB_NAME = "villagestay"

# Destination (cloud) connection
CLOUD_URL = "URL_TO_YOUR_CLOUD_MONGODB"  # Replace with your actual cloud MongoDB URL
CLOUD_DB_NAME = "villagestay"

def migrate_database():
    try:
        # Connect to source and destination
        print("Connecting to databases...")
        local_client = MongoClient(LOCAL_URL)
        
        # Connect to cloud with certifi certificates
        cloud_client = MongoClient(
            CLOUD_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=30000
        )
        
        local_db = local_client[LOCAL_DB_NAME]
        cloud_db = cloud_client[CLOUD_DB_NAME]
        
        # Test cloud connection
        print("Testing cloud connection...")
        cloud_client.server_info()
        print("Cloud connection successful!")
        
        # Get all collections from local database
        collections = local_db.list_collection_names()
        print(f"Found {len(collections)} collections: {collections}")
        
        # Migrate each collection
        for collection_name in collections:
            print(f"\nMigrating collection: {collection_name}")
            
            local_collection = local_db[collection_name]
            cloud_collection = cloud_db[collection_name]
            
            # Get all documents from local collection
            documents = list(local_collection.find())
            
            if documents:
                # Insert documents into cloud collection
                cloud_collection.insert_many(documents)
                print(f"Migrated {len(documents)} documents")
            else:
                print("No documents found in this collection")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        sys.exit(1)
    
    finally:
        # Close connections
        try:
            local_client.close()
            cloud_client.close()
        except:
            pass

if __name__ == "__main__":
    migrate_database()