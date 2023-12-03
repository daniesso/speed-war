#!/bin/bash
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/before.txt
java -jar /app/app.jar
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/after.txt