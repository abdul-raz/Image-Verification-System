// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EHRBenchmark {

    enum Role { NONE, PATIENT, DOCTOR }

    struct User {
        Role role;
        bool registered;
    }

    struct Record {
        string ipfsHash;       
        bytes32 dataHash;      
        address uploader;      
        uint256 timestamp;     
    }

    // -----------------------------
    // Storage
    // -----------------------------

    mapping(address => User) public users;

    // patient => records
    mapping(address => Record[]) private patientRecords;

    // patient => doctor => access
    mapping(address => mapping(address => bool)) public accessGranted;

    // -----------------------------
    // Events
    // -----------------------------

    event UserRegistered(address indexed user, Role role);
    event RecordUploaded(address indexed patient, uint256 gasUsed);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    // -----------------------------
    // Modifiers
    // -----------------------------

    modifier onlyRegistered() {
        require(users[msg.sender].registered, "Not registered");
        _;
    }

    modifier onlyDoctor() {
        require(users[msg.sender].role == Role.DOCTOR, "Not doctor");
        _;
    }

    modifier onlyPatient() {
        require(users[msg.sender].role == Role.PATIENT, "Not patient");
        _;
    }

    // -----------------------------
    // 1️⃣ Register User
    // -----------------------------

    function register(Role _role) public {
        require(!users[msg.sender].registered, "Already registered");
        require(_role == Role.PATIENT || _role == Role.DOCTOR, "Invalid role");

        users[msg.sender] = User({
            role: _role,
            registered: true
        });

        emit UserRegistered(msg.sender, _role);
    }

    // -----------------------------
    // 2️⃣ Upload Patient Data (Doctor Only)
    // -----------------------------

    function uploadPatientData(
        address _patient,
        string memory _ipfsHash,
        bytes32 _dataHash
    ) public onlyDoctor {

        require(users[_patient].role == Role.PATIENT, "Invalid patient");

        uint256 gasStart = gasleft();

        patientRecords[_patient].push(
            Record({
                ipfsHash: _ipfsHash,
                dataHash: _dataHash,
                uploader: msg.sender,
                timestamp: block.timestamp
            })
        );

        uint256 gasUsed = gasStart - gasleft();

        emit RecordUploaded(_patient, gasUsed);
    }

    // -----------------------------
    // 3️⃣ Patient Grants Access To Doctor
    // -----------------------------

    function grantAccess(address _doctor) public onlyPatient {
        require(users[_doctor].role == Role.DOCTOR, "Not doctor");
        accessGranted[msg.sender][_doctor] = true;
        emit AccessGranted(msg.sender, _doctor);
    }

    function revokeAccess(address _doctor) public onlyPatient {
        accessGranted[msg.sender][_doctor] = false;
        emit AccessRevoked(msg.sender, _doctor);
    }

    // -----------------------------
    // 4️⃣ Retrieve Records (Secure)
    // -----------------------------

    function retrievePatientData(address _patient)
        public
        view
        returns (Record[] memory)
    {
        require(
            msg.sender == _patient ||
            accessGranted[_patient][msg.sender],
            "Access denied"
        );

        return patientRecords[_patient];
    }

    // -----------------------------
    // 5️⃣ Record Count (Cheaper View)
    // -----------------------------

    function getRecordCount(address _patient)
        public
        view
        returns (uint256)
    {
        require(
            msg.sender == _patient ||
            accessGranted[_patient][msg.sender],
            "Access denied"
        );

        return patientRecords[_patient].length;
    }
}