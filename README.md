# MangBeli-API

This is the backend side for the MangBeli Application, a Capstone Project Bangkit Academy 2023 H2.

## Cloud Preparation:

### Google Cloud Storage Bucket:

- Create a Google Cloud Storage Bucket with Public Access.
    - Bucket settings:
        | Setting                                         | Value        |
        | ----------------------------------------------- | ------------ |
        | Enforce public access prevention on this bucket | Uncheck      |
        | Access control                                  | Fine-grained |

    - Add Permissions to `allUsers` with role `Storage Object Viewer`.

        ![Bucket settings](https://raw.githubusercontent.com/Bangkit-Capstone-CH2-PS124-Team/mangbeli-api/main/assets/img/Bucket-settings.png)

- Create a Google Cloud Storage Bucket Service Account for image upload and deletion.
    - You can make a custom role `storageObjectUploaderDeleter` with permissions `storage.objects.create` and `storage.objects.delete`.

        ![Custom role](https://raw.githubusercontent.com/Bangkit-Capstone-CH2-PS124-Team/mangbeli-api/main/assets/img/Custom-role.png)
    - Alternatively, use the predefined role `Storage Object Admin`.

        ![Predefined role](https://raw.githubusercontent.com/Bangkit-Capstone-CH2-PS124-Team/mangbeli-api/main/assets/img/Predefined-role.png)

    - Manage keys -> KEYS -> ADD KEY -> JSON -> Download -> Move to the API directory and rename to `credentials-bucket.json`.

### Google Cloud SQL MySQL Instance:

- Create a Google Cloud SQL MySQL instance.
    - Set Connections to `Public IP` and add a new network.

    - Network Settings:
        - Name: `Public`
        - Network: `0.0.0.0/0`

        ![Public IP](https://raw.githubusercontent.com/Bangkit-Capstone-CH2-PS124-Team/mangbeli-api/main/assets/img/Public-IP.png)

- Connect to MySQL instance to create a database and table (table columns documented [here](https://bangkit-capstone-ch2-ps124-team.github.io/mangbeli-api-doc/#/?id=database)).

### Firebase:

- Create a Firebase project.
    - Project settings -> Cloud Messaging -> Manage Service Accounts -> Manage keys -> KEYS -> ADD KEY -> JSON -> Download.
    - Move the downloaded file to the API directory and rename it to `credentials-firebase.json`.

    ![FCM](https://raw.githubusercontent.com/Bangkit-Capstone-CH2-PS124-Team/mangbeli-api/main/assets/img/FCM.png)

### Google Maps Platform:

- Enable Maps SDK for Android API and Directions API on [Google Maps Platform](https://console.cloud.google.com/google/maps-apis/api-list).
    - Create Credentials -> API key -> Optionally set Restrictions -> Provide the key to the MD team.

### Environment Variables:

- Create a `.env` file based on the template `env.example`:

    ```
    PORT=Your_API_Port
    DB_NAME=Your_Database_Name
    DB_HOST=Public_IP_of_Your_Cloud_SQL_Instance
    DB_USER=root
    DB_PASSWORD=Your_Database_Password
    DB_DIALECT=mysql
    ACCESS_TOKEN_SECRET=Random_String (recommended 32 characters long with upper case, lower case, and number)
    REFRESH_TOKEN_SECRET=Random_String (recommended 32 characters long with upper case, lower case, and number)
    BUCKET_NAME=Your_Storage_Bucket_Name
    ```

## File Tree Structure:

```
.
└── mangbeli-api/
    ├── node_modules/
    ├── src/
    ├── .dockerignore
    ├── .env
    ├── .eslintrc.json
    ├── .gitignore
    ├── credentials-bucket.json
    ├── credentials-firebase.json
    ├── Dockerfile
    ├── .env.example
    ├── package-lock.json
    ├── package.json
    └── README.md
```

## Running Locally:
To run the project locally and without Docker, use the following commands:
```bash
npm i
npm start
```

## Running and Deploying in Google Cloud Run:
1. Open the Cloud Shell
2. Clone this repository
3. Perform [Cloud Preparation](#cloud-preparation) steps.
4. Build the Docker image: `docker build -t <CONTAINER_NAME> .`
5. Tag the Docker image: `docker tag <CONTAINER_NAME> gcr.io/<PROJECT_ID>/<CONTAINER_NAME>`
6. Push the Docker image to Google Container Registry: `docker push gcr.io/<PROJECT_ID>/<CONTAINER_NAME>`
7. Deploy to Google Cloud Run:

    ```
    gcloud run deploy <CONTAINER_NAME> \
        --image gcr.io/<PROJECT_ID>/<CONTAINER_NAME> \
        --platform managed \
        --region=asia-southeast2 \
        --allow-unauthenticated \
        --cpu=1 \
        --memory=1Gi
    ```

## Documentation and Endpoints:
[MangBeli API Doc](https://bangkit-capstone-ch2-ps124-team.github.io/mangbeli-api-doc/)
