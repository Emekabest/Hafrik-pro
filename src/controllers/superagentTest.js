import request from "superagent";


const testSuperagent = async (token) => {

    console.log("Testing superagent with token:", token);

        const response = await fetch(`https://hafrik.com/api/v1/feed/list.php`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
        })

        // console.log(response.url);
        // console.log(response.headers)



}

export default testSuperagent;