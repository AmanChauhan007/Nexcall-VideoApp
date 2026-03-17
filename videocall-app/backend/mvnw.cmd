@REM Maven Wrapper for Windows
@echo off
set MAVEN_WRAPPER_JAR=".mvn/wrapper/maven-wrapper.jar"
set MAVEN_PROJECTBASEDIR=%~dp0

IF EXIST "%MAVEN_WRAPPER_JAR%" (
    java -jar "%MAVEN_WRAPPER_JAR%" %*
) ELSE (
    mvn %*
)
