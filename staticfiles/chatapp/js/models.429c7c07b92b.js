export class User {

  constructor(user, profile){
    this.name = "User";
    Object.assign(this, profile, user);
  }

  update(user, profile){
    Object.assign(this, user, profile);    
  }

  toString() {
    return `<User(${this.id}) ${this.username}>`;
  }

  getUsername(){
    if (this.id == LoggedUser.id){
      return "You";
    } else {
      return `@${this.username}`;
    }
  }
}


export class Conversation {
  
  constructor (data) {
    Object.assign(this, data);    
    this.timestamp = new Date(data.timestamp);
    this.name = "Conversation";

  }

  update(data){
    for (let key in data){
      this[key] = data[key]
    }    
    this.timestamp = new Date(data.timestamp);
  }

}


export class Channel {
  
  constructor (data) {
    Object.assign(this, data);    
    this.timestamp = new Date(data.timestamp);
    this.date_created = new Date(data.date_created);
    this.name = "Channel";

  }

  update(data){
    Object.assign(this, data);    
    this.timestamp = new Date(data.timestamp);
    this.date_created = new Date(data.date_created);
  }

  getTitle(){
    return `#${this.title}`;
  }
}


export class Group {
  
  constructor (data) {
    Object.assign(this, data);    
    this.timestamp = new Date(data.timestamp);
    this.date_created = new Date(data.date_created);
    this.name = "Group";
  }

  update(data) {
    Object.assign(this, data);    
    this.timestamp = new Date(data.timestamp);
    this.date_created = new Date(data.date_created);
  }
  
  getTitle () {
    return `${this.title}`;
  }

}


export class Chat {

  constructor (data){
    Object.assign(this, data);    
    this.date_created = new Date(data.date_created);
  }

  update(data) {
    let constKeys = ["replying", "creator", "conversation"];
    
    for (let key in data){
      if (constKeys.includes(key)) continue;
      this[key] =  this[key] || data[key];
    }

    if (data.message){
      if (data.message.images.length > 0){
        this.message.images = Array.from(data.message.images);
      }

      if (data.message.file){
        this.message.file = data.message.file;
      }
    }

    this.date_created = new Date(data.date_created);
  }
}


export class QuerySet {

  constructor (klass, ...queries){
    this.klass = klass;
    this.queries = [];
    this.add(...queries);
  }

  toString () {
    return `<${this.klass.name}: ${this.queries}>`;
  }

  get (attributes) {
    let query = this.filter(attributes);
    return query[0];
  }

  add (...queries) {
    queries.forEach(query => {
      if (!(query instanceof this.klass)) {
        throw new TypeError(`${query.toString()} is not an instance of ${this.klass.name}`);
      }
      this.queries.push(query);
    });
  }

  remove (attr) {
    let query = this.get(attr);
    let index = this.queries.indexOf(attr);

    if (index != -1) {
      this.queries = this.queries.slice(0, index).concat(this.queries.slice(index+1));
    }
    
    return query;
  }

  filter (attributes, exlude) {
    
    if (typeof attributes != "object"){
      throw new TypeError("Attribute must be object ");
    }

    let filtered = Array.from(this.queries);

    Object.keys(attributes).forEach(attr => {      
      filtered = filtered.filter(obj => {
        if (exlude == true){
          if (obj[attr] != attributes[attr]){
            return obj;        
          }
        } else {
          return obj[attr] == attributes[attr];
        }
      });
   
    });

    return Array.from(new Set(filtered));
  }

  exclude (attributes) {
    return this.filter(attributes, true);
  }

  sort (param, ascending) {
    this.queries.sort((i, j) => {
      if (ascending==true||ascending==undefined) {
        return i[param] - j[param];
      } else  {
        return j[param] - i[param];
      }
    });

    return this.queries;
  }

}
